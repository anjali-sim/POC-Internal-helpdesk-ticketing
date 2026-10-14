-- Re-introduces the optional Admin role (view the dashboard, reassign any ticket).
-- Admins are provisioned by the seed script, never through public registration.
ALTER TYPE "Role" ADD VALUE 'ADMIN';
