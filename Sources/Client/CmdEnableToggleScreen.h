#pragma once

#include "ChatCommandManager.h"

// /enabletogglescreen - Enable screen toggle
class CmdEnableToggleScreen : public ChatCommand
{
public:
	const char* GetName() const override { return "enabletogglescreen"; }
	bool Execute(CGame* pGame, const char* pArgs) override;
};
