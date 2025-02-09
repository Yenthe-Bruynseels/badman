import {
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayerMembershipType,
  GamePlayerMembership,
  Player,
  RankingPoint,
} from '@badman/backend-database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../utils';

@Resolver(() => Game)
export class GamesResolver {
  @Query(() => Game)
  async game(@Args('id', { type: () => ID }) id: string): Promise<Game> {
    const game = await Game.findByPk(id);

    if (!game) {
      throw new NotFoundException(id);
    }
    return game;
  }

  @Query(() => [Game])
  async games(@Args() listArgs: ListArgs): Promise<Game[]> {
    return Game.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [RankingPoint])
  async rankingPoints(
    @Parent() game: Game,
    @Args() listArgs: ListArgs
  ): Promise<RankingPoint[]> {
    return game.getRankingPoints(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterCompetition)
  async competition(
    @Parent() game: Game
  ): Promise<EncounterCompetition | null> {
    if (game.linkType == 'competition') {
      return game.getCompetition();
    }
    return null;
  }

  @ResolveField(() => DrawTournament)
  async tournament(@Parent() game: Game): Promise<DrawTournament | null> {
    if (game.linkType == 'tournament') {
      return game.getTournament();
    }

    return null;
  }

  @ResolveField(() => [GamePlayerMembershipType])
  async players(
    @Parent() game: Game
  ): Promise<(Player & GamePlayerMembership)[][]> {
    const players = (await game.getPlayers()) as (Player & {
      GamePlayerMembership: GamePlayerMembership;
    })[];

    return players?.map(
      (gamePlayer: Player & { GamePlayerMembership: GamePlayerMembership }) => {
        return {
          ...gamePlayer.GamePlayerMembership.toJSON(),
          ...gamePlayer.toJSON(),
        };
      }
    );
  }
}
