import { NextResponse } from 'next/server'
import ms from 'ms'
import { Sandbox } from '@vercel/sandbox'

export async function POST() {
    try {
        const sandbox = await Sandbox.create({
            source: {
                url: 'https://github.com/codybontecou/blog.git',
                type: 'git',
                username: 'x-access-token',
                password: process.env.GIT_ACCESS_TOKEN!,
            },
            resources: { vcpus: 4 },
            timeout: ms('10m'),
            runtime: 'node22',
        })

        console.log(`Sandbox created: ${sandbox.sandboxId}`)
        console.log(`Installing Claude Code CLI...`)

        // Install Claude Code CLI globally
        const installCLI = await sandbox.runCommand({
            cmd: 'npm',
            args: ['install', '-g', '@anthropic-ai/claude-code'],
            stderr: process.stderr,
            stdout: process.stdout,
            sudo: true,
        })

        if (installCLI.exitCode != 0) {
            await sandbox.stop()
            return NextResponse.json(
                { error: 'Installing Claude Code CLI failed' },
                { status: 500 }
            )
        }

        console.log(`✓ Claude Code CLI installed`)
        console.log(`Installing Anthropic SDK...`)

        // Install @anthropic-ai/sdk in the working directory
        const installSDK = await sandbox.runCommand({
            cmd: 'npm',
            args: ['install', '@anthropic-ai/claude-agent-sdk'],
            stderr: process.stderr,
            stdout: process.stdout,
        })

        if (installSDK.exitCode != 0) {
            await sandbox.stop()
            return NextResponse.json(
                { error: 'Installing Anthropic SDK failed' },
                { status: 500 }
            )
        }

        console.log(`✓ Anthropic SDK installed`)
        console.log(`Configuring git credentials...`)

        // Configure git with credentials for the agent to use
        const configGitUser = await sandbox.runCommand({
            cmd: 'git',
            args: ['config', '--global', 'user.name', 'Claude Agent'],
            stderr: process.stderr,
            stdout: process.stdout,
        })

        const configGitEmail = await sandbox.runCommand({
            cmd: 'git',
            args: ['config', '--global', 'user.email', 'agent@example.com'],
            stderr: process.stderr,
            stdout: process.stdout,
        })

        // Configure git credential helper to use the token
        const configGitCredential = await sandbox.runCommand({
            cmd: 'git',
            args: [
                'config',
                '--global',
                'credential.helper',
                `store --file=/tmp/git-credentials`,
            ],
            stderr: process.stderr,
            stdout: process.stdout,
        })

        // Write credentials file
        const credentialsContent = `https://x-access-token:${process.env.GIT_ACCESS_TOKEN}@github.com`
        await sandbox.writeFiles([
            {
                path: '/tmp/git-credentials',
                content: Buffer.from(credentialsContent),
            },
        ])

        if (
            configGitUser.exitCode != 0 ||
            configGitEmail.exitCode != 0 ||
            configGitCredential.exitCode != 0
        ) {
            await sandbox.stop()
            return NextResponse.json(
                { error: 'Git configuration failed' },
                { status: 500 }
            )
        }

        console.log(`✓ Git credentials configured`)
        console.log(`Verifying SDK connection...`)

        // Create a simple script to verify the SDK can be imported
        const verifyScript = `
import { query } from '@anthropic-ai/claude-agent-sdk';

console.log('SDK imported successfully');
console.log('SDK is ready to use');

const result = query({
        prompt: "Write a new blog post about running Coding Agents in Sandbox environments. Then, create a Pull Request with your changes using the Github MCP's mcp__github__create_pull_request tool.",
        options: {
            permissionMode: 'acceptEdits', // Auto-accept file edits
            maxTurns: 20, // Limit agent iterations
            allowedTools: [
                      'Read',
                      'Write',
                      'Edit',
                      'Bash',
                      'Glob',
                      'Grep',
                      // GitHub MCP tools - format is mcp__<server-name>__<tool-name>
                      'mcp__github__create_branch',
                      'mcp__github__create_pull_request',
                      'mcp__github__list_pull_requests',
                      'mcp__github__get_pull_request',
                      'mcp__github__create_issue',
                      'mcp__github__list_issues',
                      'mcp__github__get_issue',
                      'mcp__github__create_or_update_file',
                      'mcp__github__search_repositories',
                      'mcp__github__get_file_contents',
            ],
            systemPrompt: {
                type: 'preset',
                preset: 'claude_code',
                append: 'Focus on making minimal, targeted changes to fix the specific issue. Follow existing code patterns and style.',
            },
            mcpServers: {
              github: {
                  command: "npx",
                  args: ["-y", "@modelcontextprotocol/server-github"],
                  env: {
                      GITHUB_PERSONAL_ACCESS_TOKEN: "${process.env.GIT_ACCESS_TOKEN}"
                  }
              }
          },
        },
    })

    // Stream and log messages as structured JSON
    for await (const message of result) {
        // Output structured JSON for each message type
        // This will be captured and parsed by the worker
        console.log(JSON.stringify({ type: message.type, data: message }))

        if (message.type === 'result' && message.is_error) {
            console.error('Agent completed with errors')
            process.exit(1)
        }
    }

  console.log(JSON.stringify({ type: 'complete', data: { success: true } }))
  process.exit(0)
`

        await sandbox.writeFiles([
            {
                path: '/vercel/sandbox/verify.mjs',
                content: Buffer.from(verifyScript),
            },
        ])

        // Run the verification script
        const verifyRun = await sandbox.runCommand({
            cmd: 'node',
            args: ['verify.mjs'],
            stderr: process.stderr,
            stdout: process.stdout,
            env: {
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
            },
        })

        if (verifyRun.exitCode != 0) {
            await sandbox.stop()
            return NextResponse.json(
                { error: 'SDK verification failed' },
                { status: 500 }
            )
        }

        console.log(`✓ Anthropic SDK is properly connected`)
        console.log(
            `\nSuccess! Both Claude Code CLI and Anthropic SDK are installed and ready to use.`
        )

        // Stop the sandbox
        await sandbox.stop()
        console.log(`Sandbox stopped`)

        return NextResponse.json({
            success: true,
            message: 'Sandbox execution completed successfully',
            sandboxId: sandbox.sandboxId,
        })
    } catch (error) {
        console.error('Error running sandbox:', error)
        return NextResponse.json(
            { error: 'Failed to run sandbox', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
