export const PERMISSIONS = Object.freeze({
  WORKSPACE_VIEW: "workspace:view",
  WORKSPACE_UPDATE: "workspace:update",

  MEMBER_VIEW: "member:view",
  MEMBER_INVITE: "member:invite",
  MEMBER_REMOVE: "member:remove",
  MEMBER_ROLE_UPDATE: "member:role:update",

  PROJECT_VIEW: "project:view",
  PROJECT_CREATE: "project:create",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete"
});

export const ROLE_PERMISSIONS = Object.freeze({
  OWNER: Object.values(PERMISSIONS),

  ADMIN: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_UPDATE,

    PERMISSIONS.MEMBER_VIEW,
    PERMISSIONS.MEMBER_INVITE,
    PERMISSIONS.MEMBER_REMOVE,
    PERMISSIONS.MEMBER_ROLE_UPDATE,

    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_DELETE
  ],

  MANAGER: [
    PERMISSIONS.WORKSPACE_VIEW,

    PERMISSIONS.MEMBER_VIEW,
    PERMISSIONS.MEMBER_INVITE,

    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_UPDATE
  ],

  MEMBER: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.MEMBER_VIEW,

    PERMISSIONS.PROJECT_VIEW
  ],

  VIEWER: [
    PERMISSIONS.WORKSPACE_VIEW,

    PERMISSIONS.PROJECT_VIEW
  ]
});

export const ASSIGNABLE_ROLES = Object.freeze({
  OWNER: [
    "ADMIN",
    "MANAGER",
    "MEMBER",
    "VIEWER"
  ],

  ADMIN: [
    "ADMIN",
    "MANAGER",
    "MEMBER",
    "VIEWER"
  ],

  MANAGER: [
    "MEMBER",
    "VIEWER"
  ],

  MEMBER: [],
  VIEWER: []
});

export const ROLE_CHANGE_RULES = Object.freeze({
  OWNER: [
    "ADMIN",
    "MANAGER",
    "MEMBER",
    "VIEWER"
  ],

  ADMIN: [
    "MANAGER",
    "MEMBER",
    "VIEWER"
  ],

  MANAGER: [
    "MEMBER",
    "VIEWER"
  ],

  MEMBER: [],
  VIEWER: []
});

export const ROLE_REMOVAL_RULES = Object.freeze({
  OWNER: [
    "ADMIN",
    "MANAGER",
    "MEMBER",
    "VIEWER"
  ],

  ADMIN: [
    "MANAGER",
    "MEMBER",
    "VIEWER"
  ],

  MANAGER: [],
  MEMBER: [],
  VIEWER: []
});