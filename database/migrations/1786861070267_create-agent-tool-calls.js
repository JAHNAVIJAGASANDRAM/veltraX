export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("agent_tool_calls", {
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

    tool_name: {
      type: "varchar(128)",
      notNull: true
    },

    action: {
      type: "varchar(64)",
      notNull: true
    },

    resource_type: {
      type: "varchar(64)",
      notNull: true
    },

    resource_id: {
      type: "uuid"
    },

    authorization_result: {
      type: "varchar(32)",
      notNull: true
    },

    status: {
      type: "varchar(32)",
      notNull: true
    },

    metadata: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  });

  pgm.createIndex("agent_tool_calls", "workspace_id", {
    name: "agent_tool_calls_workspace_id_index"
  });

  pgm.createIndex("agent_tool_calls", "user_id", {
    name: "agent_tool_calls_user_id_index"
  });

  pgm.createIndex("agent_tool_calls", "created_at", {
    name: "agent_tool_calls_created_at_index"
  });

  pgm.createIndex(
    "agent_tool_calls",
    ["resource_type", "resource_id"],
    {
      name: "agent_tool_calls_resource_index"
    }
  );
};

export const down = (pgm) => {
  pgm.dropTable("agent_tool_calls");
};