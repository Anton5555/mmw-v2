import { z } from 'zod';
import type { Prisma } from '../../../../generated/prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const ListScalarFieldEnumSchema = z.enum(['id','name','description','letterboxdUrl','imgUrl','createdBy','tags','createdAt']);

export const MovieScalarFieldEnumSchema = z.enum(['id','title','originalTitle','originalLanguage','releaseDate','letterboxdUrl','imdbId','posterUrl','mamTotalPicks','mamTotalPoints','mamAverageScore','mamRank']);

export const MovieListScalarFieldEnumSchema = z.enum(['id','movieId','listId']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','createdAt','updatedAt','role','banned','banReason','banExpires']);

export const SessionScalarFieldEnumSchema = z.enum(['id','expiresAt','token','createdAt','updatedAt','ipAddress','userAgent','userId','impersonatedBy']);

export const AccountScalarFieldEnumSchema = z.enum(['id','accountId','providerId','userId','accessToken','refreshToken','idToken','accessTokenExpiresAt','refreshTokenExpiresAt','scope','password','createdAt','updatedAt']);

export const VerificationScalarFieldEnumSchema = z.enum(['id','identifier','value','expiresAt','createdAt','updatedAt']);

export const EventScalarFieldEnumSchema = z.enum(['id','title','description','month','day','time','year','type','createdAt','updatedAt','createdBy']);

export const MamParticipantScalarFieldEnumSchema = z.enum(['id','displayName','slug','userId','createdAt']);

export const MamPickScalarFieldEnumSchema = z.enum(['id','participantId','movieId','score','review','isSpecialMention','createdAt']);

export const DailyRecommendationScalarFieldEnumSchema = z.enum(['id','date','type','movieId','listId','participantId','curatorName','curatorImage','createdAt','updatedAt']);

export const BoardPostScalarFieldEnumSchema = z.enum(['id','title','description','order','createdAt','updatedAt','createdBy']);

export const YearTopParticipantScalarFieldEnumSchema = z.enum(['id','displayName','slug','userId','createdAt']);

export const YearTopPickScalarFieldEnumSchema = z.enum(['id','participantId','movieId','year','pickType','isTopPosition','createdAt']);

export const YearTopMovieStatsScalarFieldEnumSchema = z.enum(['id','movieId','year','pickType','totalPoints']);

export const OscarEditionScalarFieldEnumSchema = z.enum(['id','year','ceremonyDate','isActive','resultsReleased','createdAt']);

export const OscarCategoryScalarFieldEnumSchema = z.enum(['id','editionId','name','slug','order','winnerId']);

export const OscarNomineeScalarFieldEnumSchema = z.enum(['id','categoryId','name','filmTitle','imdbId','filmImdbId','movieId']);

export const OscarBallotScalarFieldEnumSchema = z.enum(['id','userId','editionId','submittedAt','score']);

export const OscarPickScalarFieldEnumSchema = z.enum(['id','ballotId','categoryId','nomineeId']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const UserRoleSchema = z.enum(['ADMIN','USER']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

export const EventTypeSchema = z.enum(['BIRTHDAY','ANNIVERSARY','DISCORD','IN_PERSON','OTHER']);

export type EventTypeType = `${z.infer<typeof EventTypeSchema>}`

export const YearTopPickTypeSchema = z.enum(['TOP_10','BEST_SEEN','WORST_3']);

export type YearTopPickTypeType = `${z.infer<typeof YearTopPickTypeSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// LIST SCHEMA
/////////////////////////////////////////

export const ListSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  letterboxdUrl: z.string(),
  imgUrl: z.string(),
  createdBy: z.string(),
  tags: z.string(),
  createdAt: z.coerce.date(),
})

export type List = z.infer<typeof ListSchema>

/////////////////////////////////////////
// MOVIE SCHEMA
/////////////////////////////////////////

export const MovieSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  originalTitle: z.string(),
  originalLanguage: z.string(),
  releaseDate: z.coerce.date(),
  letterboxdUrl: z.string(),
  imdbId: z.string(),
  posterUrl: z.string(),
  mamTotalPicks: z.number().int(),
  mamTotalPoints: z.number().int(),
  mamAverageScore: z.number(),
  mamRank: z.number().int().nullable(),
})

export type Movie = z.infer<typeof MovieSchema>

/////////////////////////////////////////
// MOVIE LIST SCHEMA
/////////////////////////////////////////

export const MovieListSchema = z.object({
  id: z.number().int(),
  movieId: z.number().int(),
  listId: z.number().int(),
})

export type MovieList = z.infer<typeof MovieListSchema>

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  role: z.string().nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullable(),
  banExpires: z.coerce.date().nullable(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string(),
  expiresAt: z.coerce.date(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string(),
  impersonatedBy: z.string().nullable(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  password: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// VERIFICATION SCHEMA
/////////////////////////////////////////

export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Verification = z.infer<typeof VerificationSchema>

/////////////////////////////////////////
// EVENT SCHEMA
/////////////////////////////////////////

export const EventSchema = z.object({
  type: EventTypeSchema,
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  month: z.number().int(),
  day: z.number().int(),
  time: z.coerce.date().nullable(),
  year: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string(),
})

export type Event = z.infer<typeof EventSchema>

/////////////////////////////////////////
// MAM PARTICIPANT SCHEMA
/////////////////////////////////////////

export const MamParticipantSchema = z.object({
  id: z.number().int(),
  displayName: z.string(),
  slug: z.string(),
  userId: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type MamParticipant = z.infer<typeof MamParticipantSchema>

/////////////////////////////////////////
// MAM PICK SCHEMA
/////////////////////////////////////////

export const MamPickSchema = z.object({
  id: z.number().int(),
  participantId: z.number().int(),
  movieId: z.number().int(),
  score: z.number().int(),
  review: z.string().nullable(),
  isSpecialMention: z.boolean(),
  createdAt: z.coerce.date(),
})

export type MamPick = z.infer<typeof MamPickSchema>

/////////////////////////////////////////
// DAILY RECOMMENDATION SCHEMA
/////////////////////////////////////////

export const DailyRecommendationSchema = z.object({
  id: z.uuid(),
  date: z.coerce.date(),
  type: z.string(),
  movieId: z.number().int().nullable(),
  listId: z.number().int().nullable(),
  participantId: z.number().int().nullable(),
  curatorName: z.string().nullable(),
  curatorImage: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DailyRecommendation = z.infer<typeof DailyRecommendationSchema>

/////////////////////////////////////////
// BOARD POST SCHEMA
/////////////////////////////////////////

export const BoardPostSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  order: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string(),
})

export type BoardPost = z.infer<typeof BoardPostSchema>

/////////////////////////////////////////
// YEAR TOP PARTICIPANT SCHEMA
/////////////////////////////////////////

export const YearTopParticipantSchema = z.object({
  id: z.number().int(),
  displayName: z.string(),
  slug: z.string(),
  userId: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type YearTopParticipant = z.infer<typeof YearTopParticipantSchema>

/////////////////////////////////////////
// YEAR TOP PICK SCHEMA
/////////////////////////////////////////

export const YearTopPickSchema = z.object({
  pickType: YearTopPickTypeSchema,
  id: z.number().int(),
  participantId: z.number().int(),
  movieId: z.number().int(),
  year: z.number().int(),
  isTopPosition: z.boolean(),
  createdAt: z.coerce.date(),
})

export type YearTopPick = z.infer<typeof YearTopPickSchema>

/////////////////////////////////////////
// YEAR TOP MOVIE STATS SCHEMA
/////////////////////////////////////////

export const YearTopMovieStatsSchema = z.object({
  pickType: YearTopPickTypeSchema,
  id: z.number().int(),
  movieId: z.number().int(),
  year: z.number().int(),
  totalPoints: z.number().int(),
})

export type YearTopMovieStats = z.infer<typeof YearTopMovieStatsSchema>

/////////////////////////////////////////
// OSCAR EDITION SCHEMA
/////////////////////////////////////////

export const OscarEditionSchema = z.object({
  id: z.number().int(),
  year: z.number().int(),
  ceremonyDate: z.coerce.date().nullable(),
  isActive: z.boolean(),
  resultsReleased: z.boolean(),
  createdAt: z.coerce.date(),
})

export type OscarEdition = z.infer<typeof OscarEditionSchema>

/////////////////////////////////////////
// OSCAR CATEGORY SCHEMA
/////////////////////////////////////////

export const OscarCategorySchema = z.object({
  id: z.number().int(),
  editionId: z.number().int(),
  name: z.string(),
  slug: z.string(),
  order: z.number().int(),
  winnerId: z.number().int().nullable(),
})

export type OscarCategory = z.infer<typeof OscarCategorySchema>

/////////////////////////////////////////
// OSCAR NOMINEE SCHEMA
/////////////////////////////////////////

export const OscarNomineeSchema = z.object({
  id: z.number().int(),
  categoryId: z.number().int(),
  name: z.string(),
  filmTitle: z.string().nullable(),
  imdbId: z.string().nullable(),
  filmImdbId: z.string().nullable(),
  movieId: z.number().int().nullable(),
})

export type OscarNominee = z.infer<typeof OscarNomineeSchema>

/////////////////////////////////////////
// OSCAR BALLOT SCHEMA
/////////////////////////////////////////

export const OscarBallotSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  editionId: z.number().int(),
  submittedAt: z.coerce.date(),
  score: z.number().int().nullable(),
})

export type OscarBallot = z.infer<typeof OscarBallotSchema>

/////////////////////////////////////////
// OSCAR PICK SCHEMA
/////////////////////////////////////////

export const OscarPickSchema = z.object({
  id: z.number().int(),
  ballotId: z.string(),
  categoryId: z.number().int(),
  nomineeId: z.number().int(),
})

export type OscarPick = z.infer<typeof OscarPickSchema>
