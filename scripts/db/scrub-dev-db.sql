-- Removes production secrets and PII from a restored copy of the database.
-- Every email/password user can sign in locally as userN@mmw.test / devpassword.
begin;

delete from session;
delete from verification;

update account
set "accessToken" = null,
    "refreshToken" = null,
    "idToken" = null,
    "accessTokenExpiresAt" = null,
    "refreshTokenExpiresAt" = null;

-- Better Auth scrypt hash of 'devpassword'
update account
set password = 'c410549e78e0cdb3538033a0b7ffa3e3:64ed02386219d53c1529eb543227d63a22e18cc68ec4e79f30c3e27db905150c3bde956e20e8771e7e79c3039ffc060fd9e9dec7e4f0c4ab7aed5993ce162bed'
where "providerId" = 'credential';

update "user" u
set email = 'user' || n.rn || '@mmw.test',
    "emailVerified" = true
from (select id, row_number() over (order by "createdAt", id) as rn from "user") n
where u.id = n.id;

commit;
