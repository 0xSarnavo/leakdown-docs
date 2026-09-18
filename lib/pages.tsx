import { AbTests, BuildACommand, Flows, GoalTests, UseCases } from "../content/run-it";
import { Changelog } from "../content/changelog";
import { Commands, Environment, ExitCodes, Files } from "../content/reference";
import { HowItWorks, Introduction, Quickstart, RequestedRuns } from "../content/get-started";
import { Personas, ReadingTheReport } from "../content/results";
import { ChoosingTheAi, Email, Safety, Troubleshooting, YourData } from "../content/setup-trust";

export const CONTENT: Record<string, () => React.ReactNode> = {
  introduction: Introduction,
  quickstart: Quickstart,
  "how-it-works": HowItWorks,
  "requested-runs": RequestedRuns,
  "use-cases": UseCases,
  "build-a-command": BuildACommand,
  "goal-tests": GoalTests,
  flows: Flows,
  "ab-tests": AbTests,
  "reading-the-report": ReadingTheReport,
  personas: Personas,
  "choosing-the-ai": ChoosingTheAi,
  email: Email,
  safety: Safety,
  "your-data": YourData,
  troubleshooting: Troubleshooting,
  commands: Commands,
  "exit-codes": ExitCodes,
  files: Files,
  environment: Environment,
  changelog: Changelog,
};
