import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLinkDto } from './dto/create-link.dto';

const SLUG_LENGTH = 7;

// Prefixos reais da API. Um link com um destes slugs nunca seria alcançado
// pelo redirect (as rotas literais têm prioridade sobre o catch-all
// `:slug`), então é rejeitado na criação em vez de virar um link morto.
const RESERVED_SLUGS = new Set(['health', 'api', 'auth', 'links']);

interface ClicksByDay {
  day: Date;
  count: bigint;
}

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateLinkDto) {
    const slug = dto.customSlug ?? (await this.generateUniqueSlug());

    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException(
        `"${slug}" é uma rota reservada da API, escolha outro slug`,
      );
    }

    if (dto.customSlug) {
      const existing = await this.prisma.link.findUnique({ where: { slug } });
      if (existing) {
        throw new ConflictException('Esse slug já está em uso');
      }
    }

    return this.prisma.link.create({
      data: { slug, originalUrl: dto.originalUrl, ownerId },
    });
  }

  findAllByOwner(ownerId: string) {
    return this.prisma.link.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneOwned(ownerId: string, id: string) {
    const link = await this.prisma.link.findFirst({ where: { id, ownerId } });
    if (!link) {
      throw new NotFoundException('Link não encontrado');
    }
    return link;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.findOneOwned(ownerId, id);
    await this.prisma.link.delete({ where: { id } });
  }

  /** Resolve o slug pra URL original e registra o clique. Usado pelo redirect público. */
  async resolveAndRegisterClick(slug: string): Promise<string> {
    const link = await this.prisma.link.findUnique({ where: { slug } });
    if (!link) {
      throw new NotFoundException('Link não encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.link.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      }),
      this.prisma.click.create({ data: { linkId: link.id } }),
    ]);

    return link.originalUrl;
  }

  async stats(ownerId: string, id: string) {
    const link = await this.findOneOwned(ownerId, id);

    const clicksByDay = await this.prisma.$queryRaw<ClicksByDay[]>`
      SELECT date_trunc('day', "createdAt") as day, count(*)::bigint as count
      FROM clicks
      WHERE "linkId" = ${link.id}
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `;

    return {
      slug: link.slug,
      totalClicks: link.clickCount,
      clicksByDay: clicksByDay.map((row) => ({
        day: row.day,
        count: Number(row.count),
      })),
    };
  }

  private async generateUniqueSlug(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = nanoid(SLUG_LENGTH);
      const existing = await this.prisma.link.findUnique({
        where: { slug: candidate },
      });
      if (!existing) return candidate;
    }

    throw new ConflictException(
      'Não foi possível gerar um slug único, tente novamente',
    );
  }
}
