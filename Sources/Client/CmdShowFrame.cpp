#include "CmdShowFrame.h"
#include "Game.h"

bool CmdShowFrame::Execute(CGame* pGame, const char* pArgs)
{
	(void)pArgs;
	pGame->m_bShowFPS = !pGame->m_bShowFPS;
	return true;
}
