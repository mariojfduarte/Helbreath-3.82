#include "GameConfigSqliteStore.h"

#define _WINSOCKAPI_
#include <windows.h>
#include <cstdio>
#include <cstring>

#include "Item.h"
#include "sqlite3.h"

extern void PutLogList(char* cMsg);

namespace
{
    bool ExecSql(sqlite3* db, const char* sql)
    {
        char* err = nullptr;
        int rc = sqlite3_exec(db, sql, nullptr, nullptr, &err);
        if (rc != SQLITE_OK) {
            char logMsg[512] = {};
            std::snprintf(logMsg, sizeof(logMsg), "(SQLITE) Exec failed: %s", err ? err : "unknown");
            PutLogList(logMsg);
            sqlite3_free(err);
            return false;
        }
        return true;
    }

    bool PrepareAndBindText(sqlite3_stmt* stmt, int idx, const char* value)
    {
        return sqlite3_bind_text(stmt, idx, value, -1, SQLITE_TRANSIENT) == SQLITE_OK;
    }

    void CopyColumnText(sqlite3_stmt* stmt, int col, char* dest, size_t destSize)
    {
        const unsigned char* text = sqlite3_column_text(stmt, col);
        if (text == nullptr) {
            if (destSize > 0) {
                dest[0] = 0;
            }
            return;
        }
        std::snprintf(dest, destSize, "%s", reinterpret_cast<const char*>(text));
    }
}

bool EnsureGameConfigDatabase(sqlite3** outDb, std::string& outPath, bool* outCreated)
{
    if (outDb == nullptr) {
        return false;
    }

    const char* dbPath = "GameConfigs.db";
    outPath = dbPath;

    bool created = false;
    DWORD attrs = GetFileAttributes(dbPath);
    if (attrs == INVALID_FILE_ATTRIBUTES) {
        created = true;
    }

    sqlite3* db = nullptr;
    if (sqlite3_open(dbPath, &db) != SQLITE_OK) {
        char logMsg[512] = {};
        std::snprintf(logMsg, sizeof(logMsg), "(SQLITE) Open failed: %s", sqlite3_errmsg(db));
        PutLogList(logMsg);
        sqlite3_close(db);
        return false;
    }

    sqlite3_busy_timeout(db, 1000);
    if (!ExecSql(db, "PRAGMA foreign_keys = ON;")) {
        sqlite3_close(db);
        return false;
    }

    const char* schemaSql =
        "BEGIN;"
        "CREATE TABLE IF NOT EXISTS items ("
        " item_id INTEGER PRIMARY KEY,"
        " name TEXT NOT NULL,"
        " item_type INTEGER NOT NULL,"
        " equip_pos INTEGER NOT NULL,"
        " item_effect_type INTEGER NOT NULL,"
        " item_effect_value1 INTEGER NOT NULL,"
        " item_effect_value2 INTEGER NOT NULL,"
        " item_effect_value3 INTEGER NOT NULL,"
        " item_effect_value4 INTEGER NOT NULL,"
        " item_effect_value5 INTEGER NOT NULL,"
        " item_effect_value6 INTEGER NOT NULL,"
        " max_lifespan INTEGER NOT NULL,"
        " special_effect INTEGER NOT NULL,"
        " sprite INTEGER NOT NULL,"
        " sprite_frame INTEGER NOT NULL,"
        " price INTEGER NOT NULL,"
        " is_for_sale INTEGER NOT NULL,"
        " weight INTEGER NOT NULL,"
        " appr_value INTEGER NOT NULL,"
        " speed INTEGER NOT NULL,"
        " level_limit INTEGER NOT NULL,"
        " gender_limit INTEGER NOT NULL,"
        " special_effect_value1 INTEGER NOT NULL,"
        " special_effect_value2 INTEGER NOT NULL,"
        " related_skill INTEGER NOT NULL,"
        " category INTEGER NOT NULL,"
        " item_color INTEGER NOT NULL"
        ");"
        "COMMIT;";

    if (!ExecSql(db, schemaSql)) {
        sqlite3_close(db);
        return false;
    }

    *outDb = db;
    if (outCreated != nullptr) {
        *outCreated = created;
    }
    return true;
}

bool SaveItemConfigs(sqlite3* db, CItem* const* itemList, int maxItems)
{
    if (db == nullptr || itemList == nullptr || maxItems <= 0) {
        return false;
    }

    if (!ExecSql(db, "BEGIN;")) {
        return false;
    }
    if (!ExecSql(db, "DELETE FROM items;")) {
        ExecSql(db, "ROLLBACK;");
        return false;
    }

    const char* sql =
        "INSERT INTO items("
        " item_id, name, item_type, equip_pos, item_effect_type, item_effect_value1,"
        " item_effect_value2, item_effect_value3, item_effect_value4, item_effect_value5,"
        " item_effect_value6, max_lifespan, special_effect, sprite, sprite_frame, price,"
        " is_for_sale, weight, appr_value, speed, level_limit, gender_limit,"
        " special_effect_value1, special_effect_value2, related_skill, category, item_color"
        ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        ExecSql(db, "ROLLBACK;");
        return false;
    }

    for (int i = 0; i < maxItems; i++) {
        if (itemList[i] == nullptr) {
            continue;
        }

        sqlite3_reset(stmt);
        sqlite3_clear_bindings(stmt);
        int col = 1;
        bool ok = true;
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sIDnum) == SQLITE_OK);
        ok &= PrepareAndBindText(stmt, col++, itemList[i]->m_cName);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_cItemType) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_cEquipPos) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sItemEffectType) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sItemEffectValue1) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sItemEffectValue2) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sItemEffectValue3) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sItemEffectValue4) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sItemEffectValue5) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sItemEffectValue6) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_wMaxLifeSpan) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sSpecialEffect) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sSprite) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sSpriteFrame) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, static_cast<int>(itemList[i]->m_wPrice)) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_bIsForSale ? 1 : 0) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_wWeight) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_cApprValue) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_cSpeed) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sLevelLimit) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_cGenderLimit) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sSpecialEffectValue1) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sSpecialEffectValue2) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_sRelatedSkill) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_cCategory) == SQLITE_OK);
        ok &= (sqlite3_bind_int(stmt, col++, itemList[i]->m_cItemColor) == SQLITE_OK);

        if (!ok || sqlite3_step(stmt) != SQLITE_DONE) {
            sqlite3_finalize(stmt);
            ExecSql(db, "ROLLBACK;");
            return false;
        }
    }

    sqlite3_finalize(stmt);
    if (!ExecSql(db, "COMMIT;")) {
        ExecSql(db, "ROLLBACK;");
        return false;
    }
    return true;
}

bool LoadItemConfigs(sqlite3* db, CItem** itemList, int maxItems)
{
    if (db == nullptr || itemList == nullptr || maxItems <= 0) {
        return false;
    }

    const char* sql =
        "SELECT item_id, name, item_type, equip_pos, item_effect_type, item_effect_value1,"
        " item_effect_value2, item_effect_value3, item_effect_value4, item_effect_value5,"
        " item_effect_value6, max_lifespan, special_effect, sprite, sprite_frame, price,"
        " is_for_sale, weight, appr_value, speed, level_limit, gender_limit,"
        " special_effect_value1, special_effect_value2, related_skill, category, item_color"
        " FROM items ORDER BY item_id;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        int col = 0;
        int itemId = sqlite3_column_int(stmt, col++);
        if (itemId < 0 || itemId >= maxItems) {
            continue;
        }

        if (itemList[itemId] != nullptr) {
            delete itemList[itemId];
            itemList[itemId] = nullptr;
        }

        CItem* item = new CItem();
        item->m_sIDnum = (short)itemId;
        CopyColumnText(stmt, col++, item->m_cName, sizeof(item->m_cName));
        item->m_cItemType = (char)sqlite3_column_int(stmt, col++);
        item->m_cEquipPos = (char)sqlite3_column_int(stmt, col++);
        item->m_sItemEffectType = (short)sqlite3_column_int(stmt, col++);
        item->m_sItemEffectValue1 = (short)sqlite3_column_int(stmt, col++);
        item->m_sItemEffectValue2 = (short)sqlite3_column_int(stmt, col++);
        item->m_sItemEffectValue3 = (short)sqlite3_column_int(stmt, col++);
        item->m_sItemEffectValue4 = (short)sqlite3_column_int(stmt, col++);
        item->m_sItemEffectValue5 = (short)sqlite3_column_int(stmt, col++);
        item->m_sItemEffectValue6 = (short)sqlite3_column_int(stmt, col++);
        item->m_wMaxLifeSpan = (uint16_t)sqlite3_column_int(stmt, col++);
        item->m_sSpecialEffect = (short)sqlite3_column_int(stmt, col++);
        item->m_sSprite = (short)sqlite3_column_int(stmt, col++);
        item->m_sSpriteFrame = (short)sqlite3_column_int(stmt, col++);
        item->m_wPrice = (uint32_t)sqlite3_column_int(stmt, col++);
        item->m_bIsForSale = (sqlite3_column_int(stmt, col++) != 0);
        item->m_wWeight = (uint16_t)sqlite3_column_int(stmt, col++);
        item->m_cApprValue = (char)sqlite3_column_int(stmt, col++);
        item->m_cSpeed = (char)sqlite3_column_int(stmt, col++);
        item->m_sLevelLimit = (short)sqlite3_column_int(stmt, col++);
        item->m_cGenderLimit = (char)sqlite3_column_int(stmt, col++);
        item->m_sSpecialEffectValue1 = (short)sqlite3_column_int(stmt, col++);
        item->m_sSpecialEffectValue2 = (short)sqlite3_column_int(stmt, col++);
        item->m_sRelatedSkill = (short)sqlite3_column_int(stmt, col++);
        item->m_cCategory = (char)sqlite3_column_int(stmt, col++);
        item->m_cItemColor = (char)sqlite3_column_int(stmt, col++);

        itemList[itemId] = item;
    }

    sqlite3_finalize(stmt);
    return true;
}

void CloseGameConfigDatabase(sqlite3* db)
{
    if (db != nullptr) {
        sqlite3_close(db);
    }
}
