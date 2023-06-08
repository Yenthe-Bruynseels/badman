import { Team } from './team.model';
import { Player } from './player.model';
import { Role } from './security';
import { Location } from './location.model';
import { UseForTeamName } from '@badman/utils';
import { Comment } from './comment.model';

export class Club {
  id?: string;
  slug?: string;
  name?: string;
  fullName?: string;
  abbreviation?: string;
  useForTeamName?: UseForTeamName;
  clubId?: string;
  country?: string;
  state?: string;

  teams?: Team[];
  players?: Player[];
  roles?: Role[];
  locations?: Location[];
  comments?: Comment[];

  clubMembership?: ClubMembership;

  constructor({ ...args }: Partial<Club>) {
    this.id = args.id;
    this.slug = args.slug;
    this.name = args.name;
    this.fullName = args.fullName;
    this.abbreviation = args.abbreviation;
    this.useForTeamName = args.useForTeamName;
    this.clubId = args.clubId;
    this.country = args.country;
    this.state = args.state;
    this.teams = args.teams?.map(
      (t) => new Team({ ...t, club: this, clubId: this.id })
    );
    this.players = args.players?.map((p) => new Player(p));
    this.roles = args.roles?.map((p) => new Role(p));
    this.locations = args.locations?.map(
      (p) =>
        new Location({
          ...p,
          club: this,
        })
    );
    this.comments = args.comments?.map((p) => new Comment(p));
    this.clubMembership = args?.clubMembership
      ? new ClubMembership(args.clubMembership)
      : undefined;
  }
}

export class ClubMembership {
  id?: string;
  start?: Date;
  end?: Date;
  active?: boolean;
  clubId?: string;
  playerId?: string;

  constructor({ ...args }: Partial<ClubMembership>) {
    this.id = args.id;
    this.start = args.start != null ? new Date(args.start) : undefined;
    this.end = args.end != null ? new Date(args.end) : undefined;
    this.active = args.active;
    this.clubId = args.clubId;
    this.playerId = args.playerId;
  }
}
