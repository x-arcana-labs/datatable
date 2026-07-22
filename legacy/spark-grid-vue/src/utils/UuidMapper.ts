import type { Row } from "../types/types"

export class UuidMapper {
    static add(row: Row): Row {
        if (!row._uuid) {
            row._uuid = crypto.randomUUID()
        }

        return row
    }
}