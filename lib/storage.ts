import {env} from 'cloudflare:workers';
export function db(){if(!env.DB)throw Error('Penyimpanan belum tersedia.');return env.DB;}
