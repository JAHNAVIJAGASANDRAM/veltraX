export const up = (pgm) => {
  pgm.createTable("oauth_grants", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()")
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE"
    },

    provider: {
      type: "text",
      notNull: true
    },

    provider_user_id: {
      type: "text",
      notNull: true
    },

    encrypted_access_token: {
      type: "text",
      notNull: true
    },

    scopes: {
      type: "text[]",
      notNull: true,
      default: pgm.func("ARRAY[]::text[]")
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },

    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    },

    revoked_at: {
      type: "timestamptz"
    }
  });

  pgm.addConstraint("oauth_grants", "oauth_grants_provider_user_unique", {
    unique: ["provider", "provider_user_id"]
  });

  pgm.createIndex("oauth_grants", ["user_id"]);
  pgm.createIndex("oauth_grants", ["provider"]);
};

export const down = (pgm) => {
  pgm.dropTable("oauth_grants");
};
