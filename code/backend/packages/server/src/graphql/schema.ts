import { NotificationService } from '@badvlasim/shared';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  addChangeEncounterMutation,
  addClubMutation,
  addCommentMutation,
  addEventCompetitionMutation,
  addEventTournamentMutation,
  addLocationMutation,
  addPlayerMutation,
  addPlayerToClubMutation,
  addPlayerToRoleMutation,
  addPlayerToTeamMutation,
  addRankingSystemGroupMutation,
  addRankingSystemMutation,
  addRoleMutation,
  addTeamMutation,
  deleteImportedEventMutation,
  removeClubMutation,
  removeLocationMutation,
  removePlayerFromRoleMutation,
  removePlayerFromTeamMutation,
  removeRoleMutation,
  removeTeamMutation,
  setGroupsCompetitionMutation,
  updateClubMutation,
  updateCommentMutation,
  updateEventCompetitionMutation,
  updateEventTournamentMutation,
  updateGlobalClaimUserMutation,
  updateLocationMutation,
  updatePlayerMutation,
  updatePlayerTeamMutation,
  updateRankingSystemGroupMutation,
  updateRankingSystemMutation,
  updateRoleMutation,
  updateSubEventTeamMutation,
  updateTeamLocationMutation,
  addPlayerBaseSubEventMutation,
  removePlayerBaseSubEventMutation,
  updateTeamMutation,
  updateTournamentEventLocationMutation
} from './mutations';
import { updatePlayerRankingMutation } from './mutations/player.mutations';
import {
  claimsQuery,
  clubQuery,
  clubsQuery,
  encounterChangeQuery,
  encounterChangesQuery,
  encounterCompetitionQuery,
  encounterCompetitionsQuery,
  eventCompetitionQuery,
  eventCompetitionsQuery,
  eventTournamentQuery,
  eventTournamentsQuery,
  gamesQuery,
  importedQuery,
  locationQuery,
  locationsQuery,
  playerQuery,
  playersQuery,
  roleQuery,
  rolesQuery,
  systemQuery,
  systemsGroupsQuery,
  systemsQuery,
  teamQuery,
  teamsQuery
} from './queries';

export const createSchema = (notificationService: NotificationService) => {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: () => ({
        claims: claimsQuery,
        club: clubQuery,
        clubs: clubsQuery,
        eventCompetition: eventCompetitionQuery,
        eventCompetitions: eventCompetitionsQuery,
        eventTournament: eventTournamentQuery,
        eventTournaments: eventTournamentsQuery,
        games: gamesQuery,
        imported: importedQuery,
        location: locationQuery,
        locations: locationsQuery,
        player: playerQuery,
        players: playersQuery,
        rankingSystemGroup: systemsGroupsQuery,
        role: roleQuery,
        roles: rolesQuery,
        system: systemQuery,
        systems: systemsQuery,
        team: teamQuery,
        teams: teamsQuery,
        encounterChange: encounterChangeQuery,
        encounterChanges: encounterChangesQuery,
        encounterCompetition: encounterCompetitionQuery,
        encounterCompetitions: encounterCompetitionsQuery
      })
    }),
    mutation: new GraphQLObjectType({
      name: 'RootMutationType',
      fields: () => ({
        addClub: addClubMutation,
        addComment: addCommentMutation,
        addEventCompetition: addEventCompetitionMutation,
        addEventTournament: addEventTournamentMutation,
        addLocation: addLocationMutation,
        addPlayer: addPlayerMutation,
        addPlayerToClub: addPlayerToClubMutation,
        addPlayerToRole: addPlayerToRoleMutation,
        addPlayerToTeam: addPlayerToTeamMutation,
        addRankingSystem: addRankingSystemMutation,
        addRankingSystemGroup: addRankingSystemGroupMutation,
        addRole: addRoleMutation,
        addTeam: addTeamMutation,
        addChangeEncounter: addChangeEncounterMutation(notificationService),
        deleteImportedEvent: deleteImportedEventMutation,
        removeClub: removeClubMutation,
        removeLocation: removeLocationMutation,
        removePlayerFromRole: removePlayerFromRoleMutation,
        removePlayerFromTeam: removePlayerFromTeamMutation,
        removeTeam: removeTeamMutation,
        removeRole: removeRoleMutation,
        setGroupsCompetition: setGroupsCompetitionMutation,
        updateClub: updateClubMutation,
        updateComment: updateCommentMutation,
        updateEventCompetition: updateEventCompetitionMutation,
        updateEventTournament: updateEventTournamentMutation,
        updateGlobalClaimUser: updateGlobalClaimUserMutation,
        updateLocation: updateLocationMutation,
        updatePlayer: updatePlayerMutation,
        updatePlayerRanking: updatePlayerRankingMutation,
        updatePlayerTeam: updatePlayerTeamMutation,
        updateRankingSystem: updateRankingSystemMutation,
        updateRankingSystemGroup: updateRankingSystemGroupMutation,
        updateRole: updateRoleMutation,
        updateSubEventTeam: updateSubEventTeamMutation,
        updateTeam: updateTeamMutation,
        updateTeamLocation: updateTeamLocationMutation,
        updateTournamentEventLocation: updateTournamentEventLocationMutation,
        addPlayerBaseSubEvent: addPlayerBaseSubEventMutation,
        removePlayerBaseSubEvent: removePlayerBaseSubEventMutation,
      })
    })
  });
};
