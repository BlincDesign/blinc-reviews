-- "Rejected" and "Hidden" both meant "not on the store"; keep one status.
-- The REJECTED enum value stays for compatibility but is no longer set.
UPDATE "Review" SET "status" = 'HIDDEN', "publishedAt" = NULL WHERE "status" = 'REJECTED';
