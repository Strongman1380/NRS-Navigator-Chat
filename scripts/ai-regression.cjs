const { execSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, '.tmp-ai-regression');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  rmSync(outDir, { recursive: true, force: true });

  execSync(
    'npx tsc --module es2020 --target es2020 --skipLibCheck --esModuleInterop --rootDir src/lib --outDir .tmp-ai-regression src/lib/aiResponses.ts',
    { cwd: rootDir, stdio: 'pipe' },
  );

  const modulePath = pathToFileURL(path.join(outDir, 'aiResponses.js')).href;
  const {
    generateAIResponse,
    generateTopicSummary,
    analyzeConversation,
  } = await import(modulePath);

  const cases = [
    {
      name: 'Foodbox intent resolves to food tag',
      run: () => {
        const result = generateAIResponse('I need a foodbox today', {
          messageCount: 1,
          previousTopics: [],
        });
        assert(result.tags?.includes('Food'), `Expected Food tag, got: ${JSON.stringify(result.tags)}`);
      },
    },
    {
      name: 'Emergency food does not trigger urgent crisis response',
      run: () => {
        const result = generateAIResponse('I need emergency food in Lincoln', {
          messageCount: 2,
          previousTopics: [],
        });
        assert(result.priority !== 'urgent', `Unexpected urgent priority: ${result.priority}`);
      },
    },
    {
      name: 'Suicidal statement triggers urgent crisis response',
      run: () => {
        const result = generateAIResponse('I want to die and hurt myself', {
          messageCount: 2,
          previousTopics: [],
        });
        assert(result.priority === 'urgent', `Expected urgent priority, got: ${result.priority}`);
        assert(result.tags?.includes('Crisis'), `Expected Crisis tag, got: ${JSON.stringify(result.tags)}`);
      },
    },
    {
      name: 'Topic summary classifies food intent',
      run: () => {
        const summary = generateTopicSummary('Need emergency food sources and pantry help');
        assert(summary.includes('Food Assistance'), `Expected Food Assistance summary, got: ${summary}`);
      },
    },
    {
      name: 'Conversation analysis detects housing + food with non-urgent severity',
      run: () => {
        const analysis = analyzeConversation([
          { sender: 'visitor', content: 'I am homeless and need a food box' },
          { sender: 'visitor', content: 'I am in Lincoln Nebraska' },
        ]);
        assert(analysis.detectedTopics.includes('housing'), `Expected housing topic, got: ${JSON.stringify(analysis.detectedTopics)}`);
        assert(analysis.detectedTopics.includes('food'), `Expected food topic, got: ${JSON.stringify(analysis.detectedTopics)}`);
        assert(analysis.urgency !== 'urgent', `Expected non-urgent urgency, got: ${analysis.urgency}`);
      },
    },
    {
      name: 'Legal request stays legal',
      run: () => {
        const result = generateAIResponse('I need legal aid for a court date', {
          messageCount: 1,
          previousTopics: [],
        });
        assert(result.tags?.includes('Legal'), `Expected Legal tag, got: ${JSON.stringify(result.tags)}`);
      },
    },
  ];

  const failures = [];
  for (const testCase of cases) {
    try {
      testCase.run();
      process.stdout.write(`PASS: ${testCase.name}\n`);
    } catch (error) {
      failures.push({ name: testCase.name, error: error.message || String(error) });
      process.stdout.write(`FAIL: ${testCase.name} - ${error.message || String(error)}\n`);
    }
  }

  try {
    rmSync(outDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Cleanup failed:', err);
  }

  if (failures.length > 0) {
    process.exitCode = 1;
    throw new Error(`AI regression suite failed (${failures.length} case(s)).`);
  }

  process.stdout.write(`AI regression suite passed (${cases.length} cases).\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.message || String(error)}\n`);
  process.exit(1);
});
