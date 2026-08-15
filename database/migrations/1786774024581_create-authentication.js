export const up = (pgm) => {
  pgm.addColumn("users", {
    password_hash: {
      type: "text",
      notNull: true
    }
  });

  pgm.createTable("sessions", {
    id: {
      type: "text",
      primaryKey: true
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE"
    },
    expires_at: {
      type: "timestamptz",
      notNull: true
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
    }
  });

  pgm.createIndex("sessions", ["user_id"]);
  pgm.createIndex("sessions", ["expires_at"]);
};

export const down = (pgm) => {
  pgm.dropTable("sessions");
  pgm.dropColumn("users", "password_hash");
};