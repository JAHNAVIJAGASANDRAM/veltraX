export const up = (pgm) => {
  pgm.createTable("projects", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()")
    },

    workspace_id: {
      type: "uuid",
      notNull: true,
      references: "workspaces(id)",
      onDelete: "CASCADE"
    },

    name: {
      type: "varchar(255)",
      notNull: true
    },

    description: {
      type: "text",
      notNull: false
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

  pgm.addConstraint(
    "projects",
    "projects_workspace_name_unique",
    {
      unique: ["workspace_id", "name"]
    }
  );

  pgm.createIndex("projects", ["workspace_id"]);
};

export const down = (pgm) => {
  pgm.dropTable("projects");
};