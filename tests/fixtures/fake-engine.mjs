// Portable process fixture. No shell scripts or real container engine required.
const scenario = process.argv[2];
if (scenario === 'fail') { console.error('Engine ist nicht bereit.'); process.exitCode = 42; }
else if (scenario === 'timeout') { setTimeout(() => {}, 30_000); }
else {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  console.log(JSON.stringify({ args: process.argv.slice(3), input }));
}
