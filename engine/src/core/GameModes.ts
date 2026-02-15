/**
 * Game mode constants — mirrors C++ DEF_GAMEMODE_* from Sources/Client/Game.h
 *
 * These control the main state machine of the client. CGame.m_cGameMode holds
 * the current mode; SceneManager dispatches update/draw based on it.
 */

export const DEF_GAMEMODE_NULL                   = -2;
export const DEF_GAMEMODE_ONQUIT                 = -1;
export const DEF_GAMEMODE_ONMAINMENU             =  0;
export const DEF_GAMEMODE_ONCONNECTING           =  1;
export const DEF_GAMEMODE_ONLOADING              =  2;
export const DEF_GAMEMODE_ONWAITINGINITDATA      =  3;
export const DEF_GAMEMODE_ONMAINGAME             =  4;
export const DEF_GAMEMODE_ONCONNECTIONLOST       =  5;
export const DEF_GAMEMODE_ONMSG                  =  6;
export const DEF_GAMEMODE_ONCREATENEWACCOUNT     =  7;
export const DEF_GAMEMODE_ONLOGIN                =  8;
export const DEF_GAMEMODE_ONQUERYFORCELOGIN      =  9;
export const DEF_GAMEMODE_ONSELECTCHARACTER      = 10;
export const DEF_GAMEMODE_ONCREATENEWCHARACTER   = 11;
export const DEF_GAMEMODE_ONWAITINGRESPONSE      = 12;
export const DEF_GAMEMODE_ONQUERYDELETECHARACTER = 13;
export const DEF_GAMEMODE_ONLOGRESMSG            = 14;
export const DEF_GAMEMODE_ONCHANGEPASSWORD       = 15;
export const DEF_GAMEMODE_ONVERSIONNOTMATCH      = 17;
export const DEF_GAMEMODE_ONINTRODUCTION         = 18;
export const DEF_GAMEMODE_ONAGREEMENT            = 19;
export const DEF_GAMEMODE_ONSELECTSERVER         = 20;
export const DEF_GAMEMODE_ONINPUTKEYCODE         = 21;
