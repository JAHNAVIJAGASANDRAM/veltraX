export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumn("oauth_states", {
    session_id: {
      type: "text",
      notNull: true,
      references: "sessions(id)",
      onDelete: "CASCADE"
    }
  });

  pgm.createIndex("oauth_states", ["session_id"]);
};

export const down = (pgm) => {
  pgm.dropColumn("oauth_states", "session_id");
};
