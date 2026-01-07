#pragma once

#include <string>

struct sqlite3;
class CItem;

bool EnsureGameConfigDatabase(sqlite3** outDb, std::string& outPath, bool* outCreated);
bool SaveItemConfigs(sqlite3* db, CItem* const* itemList, int maxItems);
bool LoadItemConfigs(sqlite3* db, CItem** itemList, int maxItems);
void CloseGameConfigDatabase(sqlite3* db);
