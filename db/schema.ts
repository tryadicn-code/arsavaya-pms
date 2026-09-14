import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const workspace = sqliteTable('pms_workspace',{id:text('id').primaryKey(),version:integer('version').notNull().default(0),data:text('data').notNull()});
export const feedKeys = sqliteTable('pms_feed_keys',{hash:text('hash').primaryKey(),workspace:text('workspace').notNull(),connection:text('connection').notNull()});
