import {describe,it,expect} from 'vitest';
import type {Sandbox} from 'e2b';
import {readBoundedOutput} from '../src/execution.js';

describe('bounded sandbox output transfer',()=>{
  it('decodes a bounded result without using an unbounded filesystem download',async()=>{
    const sandbox={commands:{run:async(_command:string,options:{onStdout:(chunk:string)=>void})=>{options.onStdout(Buffer.from('5\n').toString('base64')+'\n');return {exitCode:0};}}} as unknown as Pick<Sandbox,'commands'>;
    expect(await readBoundedOutput(sandbox)).toBe('5\n');
  });
  it('stops accumulating malicious oversized streamed output',async()=>{
    const sandbox={commands:{run:async(_command:string,options:{onStdout:(chunk:string)=>void})=>{options.onStdout('A'.repeat(12001));return {exitCode:0};}}} as unknown as Pick<Sandbox,'commands'>;
    await expect(readBoundedOutput(sandbox)).rejects.toThrow('Output limit exceeded');
  });
  it('rejects a reader failure instead of accepting an empty or special-file result',async()=>{
    const sandbox={commands:{run:async()=>({exitCode:1})}} as unknown as Pick<Sandbox,'commands'>;
    await expect(readBoundedOutput(sandbox)).rejects.toThrow('bounded regular file');
  });
});
