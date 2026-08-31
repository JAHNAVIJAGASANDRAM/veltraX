export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("oauth_states", {
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
      type: "varchar(32)",
      notNull: true
    },

    state_hash: {
      type: "varchar(64)",
      notNull: true,
      unique: true
    },

    expires_at: {
      type: "timestamptz",
      notNull: true
    },

    used_at: {
      type: "timestamptz"
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.createIndex("oauth_states", ["user_id"]);
  pgm.createIndex("oauth_states", ["provider"]);
  pgm.createIndex("oauth_states", ["expires_at"]);
};

export const down = (pgm) => {
  pgm.dropTable("oauth_states");
};
