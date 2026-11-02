CREATE TABLE IF NOT EXISTS subscription_categories (
  name TEXT PRIMARY KEY
);

INSERT OR IGNORE INTO subscription_categories (name)
SELECT DISTINCT category FROM subscription_catalog WHERE category <> '';
