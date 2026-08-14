export const up = (pgm) => {
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()")
    },
    email: {
      type: "varchar(255)",
      notNull: true,
      unique: true
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

  pgm.createTable("workspaces", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()")
    },
    name: {
      type: "varchar(255)",
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

  pgm.createTable("workspace_members", {
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
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE"
    },
    role: {
      type: "varchar(50)",
      notNull: true
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.addConstraint(
    "workspace_members",
    "workspace_members_workspace_user_unique",
    {
      unique: ["workspace_id", "user_id"]
    }
  );

  pgm.addConstraint(
    "workspace_members",
    "workspace_members_role_check",
    {
      check: "role IN ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER')"
    }
  );

  pgm.createIndex("workspace_members", ["workspace_id"]);
  pgm.createIndex("workspace_members", ["user_id"]);
};

export const down = (pgm) => {
  pgm.dropTable("workspace_members");
  pgm.dropTable("workspaces");
  pgm.dropTable("users");
};