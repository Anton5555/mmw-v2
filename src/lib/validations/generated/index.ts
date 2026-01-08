import { z } from 'zod';
import type { Prisma } from '@prisma/client';

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

export const MamPickScalarFieldEnumSchema = z.enum(['id','participantId','movieId','score','review','createdAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const UserRoleSchema = z.enum(['ADMIN','USER']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

export const EventTypeSchema = z.enum(['BIRTHDAY','ANNIVERSARY','DISCORD','IN_PERSON','OTHER']);

export type EventTypeType = `${z.infer<typeof EventTypeSchema>}`

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
  createdAt: z.coerce.date(),
})

export type MamPick = z.infer<typeof MamPickSchema>
