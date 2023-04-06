import { Game } from './game.model';
import { Player } from './player.model';
import { RankingSystem } from './ranking-system.model';

export class RankingPoint {
  points?: number;
  player?: Player;
  game?: Game;
  system?: RankingSystem;
  rankingDate?: Date;
  differenceInLevel?: number;
  systemId?: string;
  playerId?: string;

  constructor({ ...args }: Partial<RankingPoint>) {
    this.points = args.points;
    this.playerId = args.playerId;
    this.player = args.player ? new Player(args.player) : undefined;
    this.game = args.game ? new Game(args.game) : undefined;
    this.system = args.system ? new RankingSystem(args.system) : undefined;
    this.rankingDate = args.rankingDate;
    this.differenceInLevel = args.differenceInLevel;
    this.systemId = args.systemId;
  }
}
