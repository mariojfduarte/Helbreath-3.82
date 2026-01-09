#include "CmdEnableToggleScreen.h"
#include "Game.h"

bool CmdEnableToggleScreen::Execute(CGame* pGame, const char* pArgs)
{
	(void)pArgs;
	pGame->m_bToggleScreen = true;
	return true;
}
