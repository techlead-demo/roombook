-- BR-9: room names are unique ignoring letter case, capacity is 1 to 100.
ALTER TABLE rooms ADD COLUMN name_key VARCHAR(50) GENERATED ALWAYS AS (LOWER(name));

CREATE UNIQUE INDEX rooms_name_key_idx ON rooms (name_key);

ALTER TABLE rooms ADD CONSTRAINT rooms_capacity_range CHECK (capacity BETWEEN 1 AND 100);
