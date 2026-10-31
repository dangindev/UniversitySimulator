import {config} from 'dotenv';
import {resolve} from 'node:path';
import {Pool} from 'pg';
import {postgresSchema} from './store.js';

config({path:resolve(process.cwd(),'../../.env'),quiet:true});config({quiet:true});
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL for the dedicated migration role.');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
try{await pool.query(postgresSchema);console.log('Applied PostgreSQL migrations through version 3. Missing legacy curriculum-version fields were pinned to 2026.v1; existing versions were preserved.');}finally{await pool.end();}
