/**
 * NetMessages — Network protocol message IDs and constants.
 * Mirrors C++ Dependencies/Shared/NetMessages.h.
 *
 * All message IDs and notification types used by both client and server.
 * Organized by category matching the C++ header structure.
 */

// ── Basic Message Types ──────────────────────────────────────────

export const DEF_MSGTYPE_CONFIRM = 0x0F14;
export const DEF_MSGTYPE_REJECT  = 0x0F15;

// ── Player Initialization ────────────────────────────────────────

export const MSGID_REQUEST_INITPLAYER   = 0x05040205;
export const MSGID_RESPONSE_INITPLAYER  = 0x05040206;
export const MSGID_REQUEST_INITDATA     = 0x05080404;
export const MSGID_RESPONSE_INITDATA    = 0x05080405;

// ── Motion and Action ────────────────────────────────────────────

export const MSGID_COMMAND_MOTION   = 0x0FA314D5;
export const MSGID_RESPONSE_MOTION  = 0x0FA314D6;
export const MSGID_EVENT_MOTION     = 0x0FA314D7;
export const MSGID_EVENT_LOG        = 0x0FA314D8;
export const MSGID_EVENT_COMMON     = 0x0FA314DB;
export const MSGID_COMMAND_COMMON   = 0x0FA314DC;

// ── Common Action Types ──────────────────────────────────────────

export const DEF_COMMONTYPE_ITEMDROP               = 0x0A01;
export const DEF_COMMONTYPE_EQUIPITEM              = 0x0A02;
export const DEF_COMMONTYPE_REQ_LISTCONTENTS       = 0x0A03;
export const DEF_COMMONTYPE_REQ_PURCHASEITEM       = 0x0A04;
export const DEF_COMMONTYPE_GIVEITEMTOCHAR         = 0x0A05;
export const DEF_COMMONTYPE_RELEASEITEM            = 0x0A0A;
export const DEF_COMMONTYPE_TOGGLECOMBATMODE       = 0x0A0B;
export const DEF_COMMONTYPE_SETITEM                = 0x0A0C;
export const DEF_COMMONTYPE_MAGIC                  = 0x0A0D;
export const DEF_COMMONTYPE_REQ_STUDYMAGIC         = 0x0A0E;
export const DEF_COMMONTYPE_REQ_TRAINSKILL         = 0x0A0F;
export const DEF_COMMONTYPE_REQ_USEITEM            = 0x0A11;
export const DEF_COMMONTYPE_REQ_USESKILL           = 0x0A12;
export const DEF_COMMONTYPE_REQ_SELLITEM           = 0x0A13;
export const DEF_COMMONTYPE_REQ_REPAIRITEM         = 0x0A14;
export const DEF_COMMONTYPE_REQ_SELLITEMCONFIRM    = 0x0A15;
export const DEF_COMMONTYPE_REQ_REPAIRITEMCONFIRM  = 0x0A16;
export const DEF_COMMONTYPE_TOGGLESAFEATTACKMODE   = 0x0A18;
export const DEF_COMMONTYPE_REQ_CREATEPORTION      = 0x0A19;
export const DEF_COMMONTYPE_TALKTONPC              = 0x0A1A;
export const DEF_COMMONTYPE_EXCHANGEITEMTOCHAR     = 0x0A1E;
export const DEF_COMMONTYPE_SETEXCHANGEITEM        = 0x0A1F;
export const DEF_COMMONTYPE_CONFIRMEXCHANGEITEM    = 0x0A20;
export const DEF_COMMONTYPE_CANCELEXCHANGEITEM     = 0x0A21;
export const DEF_COMMONTYPE_QUESTACCEPTED          = 0x0A22;
export const DEF_COMMONTYPE_BUILDITEM              = 0x0A23;
export const DEF_COMMONTYPE_CRAFTITEM              = 0x0A28;
export const DEF_COMMONTYPE_REQUEST_JOINPARTY      = 0x0A31;
export const DEF_COMMONTYPE_UPGRADEITEM            = 0x0A58;
export const DEF_COMMONTYPE_REQ_REPAIRALL          = 0x0F10;
export const DEF_COMMONTYPE_REQ_REPAIRALLCONFIRM   = 0x0F13;

// ── Notifications (Server → Client) ─────────────────────────────

export const MSGID_NOTIFY = 0x0FA314D0;

export const DEF_NOTIFY_ITEMOBTAINED       = 0x0B01;
export const DEF_NOTIFY_HP                 = 0x0B07;
export const DEF_NOTIFY_KILLED             = 0x0B09;
export const DEF_NOTIFY_EXP               = 0x0B0A;
export const DEF_NOTIFY_MP                 = 0x0B14;
export const DEF_NOTIFY_SP                 = 0x0B15;
export const DEF_NOTIFY_LEVELUP            = 0x0B16;
export const DEF_NOTIFY_ITEMLIFESPANEND    = 0x0B17;
export const DEF_NOTIFY_ITEMTOBANK         = 0x0B19;
export const DEF_NOTIFY_NEWDYNAMICOBJECT   = 0x0B21;
export const DEF_NOTIFY_DELDYNAMICOBJECT   = 0x0B22;
export const DEF_NOTIFY_SKILL             = 0x0B23;
export const DEF_NOTIFY_MAGICEFFECTON      = 0x0B27;
export const DEF_NOTIFY_MAGICEFFECTOFF     = 0x0B28;
export const DEF_NOTIFY_TOTALUSERS         = 0x0B29;
export const DEF_NOTIFY_SHOWMAP            = 0x0B2B;
export const DEF_NOTIFY_SELLITEMPRICE      = 0x0B2D;
export const DEF_NOTIFY_REPAIRITEMPRICE    = 0x0B2F;
export const DEF_NOTIFY_ITEMREPAIRED       = 0x0B30;
export const DEF_NOTIFY_ITEMSOLD           = 0x0B31;
export const DEF_NOTIFY_CHARISMA           = 0x0B32;
export const DEF_NOTIFY_PLAYERPROFILE      = 0x0B37;
export const DEF_NOTIFY_HUNGER             = 0x0B39;
export const DEF_NOTIFY_TIMECHANGE         = 0x0B41;
export const DEF_NOTIFY_NOTICEMSG          = 0x0B46;
export const DEF_NOTIFY_WHETHERCHANGE      = 0x0B4D;
export const DEF_NOTIFY_SAFEATTACKMODE     = 0x0B51;
export const DEF_NOTIFY_NPCTALK            = 0x0B57;
export const DEF_NOTIFY_ITEMPOSLIST        = 0x0B5B;
export const DEF_NOTIFY_OPENEXCHANGEWINDOW = 0x0B5E;
export const DEF_NOTIFY_QUESTCONTENTS      = 0x0B66;
export const DEF_NOTIFY_DAMAGEMOVE         = 0x0B74;
export const DEF_NOTIFY_FORCEDISCONN       = 0x0B75;
export const DEF_NOTIFY_CRUSADE            = 0x0B94;
export const DEF_NOTIFY_PARTY              = 0x0BA2;
export const DEF_NOTIFY_ITEMATTRIBUTECHANGE = 0x0BA3;
export const DEF_NOTIFY_CRAFTING_SUCCESS   = 0x0BF0;
export const DEF_NOTIFY_CRAFTING_FAIL      = 0x0BF1;
export const DEF_NOTIFY_REPAIRALLPRICES    = 0x0F11;

// ── Configuration Content ────────────────────────────────────────

export const MSGID_ITEMCONFIGURATIONCONTENTS  = 0x0FA314D9;
export const MSGID_PLAYERITEMLISTCONTENTS      = 0x0FA314DD;
export const MSGID_PLAYERCHARACTERCONTENTS     = 0x0FA40000;

// ── Connection and Chat ──────────────────────────────────────────

export const MSGID_COMMAND_CHECKCONNECTION = 0x03203203;
export const MSGID_COMMAND_CHATMSG         = 0x03203204;

// ── Login and Account ────────────────────────────────────────────

export const MSGID_REQUEST_LOGIN              = 0x0FC94201;
export const MSGID_REQUEST_CREATENEWACCOUNT   = 0x0FC94202;
export const MSGID_RESPONSE_LOG               = 0x0FC94203;
export const MSGID_REQUEST_CREATENEWCHARACTER = 0x0FC94204;
export const MSGID_REQUEST_ENTERGAME          = 0x0FC94205;
export const MSGID_RESPONSE_ENTERGAME         = 0x0FC94206;
export const MSGID_REQUEST_DELETECHARACTER    = 0x0FC94207;
export const MSGID_REQUEST_CHANGEPASSWORD     = 0x0FC94210;

// ── Log Response Types ───────────────────────────────────────────

export const DEF_LOGRESMSGTYPE_CONFIRM              = 0x0F14;
export const DEF_LOGRESMSGTYPE_REJECT               = 0x0F15;
export const DEF_LOGRESMSGTYPE_PASSWORDMISMATCH     = 0x0F16;
export const DEF_LOGRESMSGTYPE_NOTEXISTINGACCOUNT   = 0x0F17;
export const DEF_LOGRESMSGTYPE_NEWACCOUNTCREATED    = 0x0F18;
export const DEF_LOGRESMSGTYPE_NEWCHARACTERCREATED  = 0x0F1C;
export const DEF_LOGRESMSGTYPE_CHARACTERDELETED     = 0x0F1F;

// ── Enter Game Types ─────────────────────────────────────────────

export const DEF_ENTERGAMERESTYPE_PLAYING     = 0x0F20;
export const DEF_ENTERGAMERESTYPE_CONFIRM     = 0x0F22;
export const DEF_ENTERGAMERESTYPE_FORCEDISCONN = 0x0F23;

// ── Misc Messages ────────────────────────────────────────────────

export const MSGID_REQUEST_TELEPORT     = 0x0EA03201;
export const MSGID_LEVELUPSETTINGS      = 0x11A01000;
export const MSGID_DYNAMICOBJECT        = 0x12A01001;
export const MSGID_REQUEST_SETITEMPOS   = 0x180ACE0A;
export const MSGID_REQUEST_PANNING      = 0x27B314D0;
export const MSGID_RESPONSE_PANNING     = 0x27B314D1;
export const MSGID_REQUEST_RESTART      = 0x28010EEE;
export const MSGID_REQUEST_SELLITEMLIST = 0x2900AD30;
export const MSGID_STATECHANGEPOINT     = 0x11A01001;
