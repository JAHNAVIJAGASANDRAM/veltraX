export const up = (pgm) => {
  pgm.createTable("tasks", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()")
    },

    project_id: {
      type: "uuid",
      notNull: true,
      references: "projects(id)",
      onDelete: "CASCADE"
    },

    title: {
      type: "varchar(255)",
      notNull: true
    },

    description: {
      type: "text",
      notNull: false
    },

    status: {
      type: "varchar(32)",
      notNull: true,
      default: "TODO"
    },

    assigned_to: {
      type: "uuid",
      notNull: false,
      references: "users(id)",
      onDelete: "SET NULL"
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
    "tasks",
    "tasks_status_check",
    {
      check: "status IN ('TODO', 'IN_PROGRESS', 'DONE')"
    }
  );

  pgm.createIndex("tasks", ["project_id"]);
  pgm.createIndex("tasks", ["assigned_to"]);
  pgm.createIndex("tasks", ["status"]);
};

export const down = (pgm) => {
  pgm.dropTable("tasks");
};