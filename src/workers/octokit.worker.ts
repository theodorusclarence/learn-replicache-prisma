// import { EventType, Prisma } from '@prisma/client';
// import { Queue, Worker } from 'bullmq';
// import { Octokit } from 'octokit';

// import { prismaClient } from '@/utils/server/prisma';
// import { redis_connection } from '@/utils/server/redis';

// const octokit = new Octokit({
//   auth: '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',
// });

// export const octokitQueue = new Queue('octokit', {
//   connection: redis_connection,
// });

// const worker = new Worker(
//   'octokit',
//   async (job) => {
//     // get the job name -- event type
//     const jobName = job.name as EventType;

//     // decide which worker needs to run from the above
//     switch (jobName) {
//       case 'CREATE_ISSUE': {
//         const { todoId, eventId } = job.data;
//         await prismaClient.event.update({
//           where: {
//             id: eventId,
//           },
//           data: {
//             status: 'PROCESSING',
//           },
//         });
//         await prismaClient.$transaction(
//           async (tx) => {
//             const todo = await tx.todo.findUnique({
//               where: {
//                 id: todoId,
//               },
//               include: {
//                 GithubIssue: true,
//               },
//             });
//             if (!todo) throw new Error('Todo not found');
//             if (todo.GithubIssue) throw new Error('Issue already created');

//             try {
//               const issue = await octokit.rest.issues.create({
//                 owner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'rtpa25',
//                 repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'dimension-dump',
//                 title: `${todo.id}/${todo.title}`,
//                 body: `${todo.description ?? ''}
//             Created from learn-replicache-prisma app
//             `,
//               });

//               await tx.githubIssue.create({
//                 data: {
//                   number: issue.data.number,
//                   owner: issue.data.user?.login ?? '',
//                   repo: issue.data.repository_url.split('/').pop() ?? '',
//                   id: issue.data.node_id,
//                   todoId,
//                 },
//               });

//               await tx.event.update({
//                 where: {
//                   id: eventId,
//                 },
//                 data: {
//                   status: 'SUCCESS',
//                 },
//               });
//             } catch (error) {
//               console.error(error);
//               await tx.event.update({
//                 where: {
//                   id: eventId,
//                 },
//                 data: {
//                   status: 'FAILED',
//                 },
//               });
//             }
//           },
//           {
//             isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Required for Replicache to work
//             maxWait: 5000, // default: 2000
//             timeout: 6000, // default: 5000
//           }
//         );
//         break;
//       }
//       default:
//         break;
//     }
//     // create issue
//     // fetch todoId from job.data

//     return 'done';
//   },
//   {
//     connection: redis_connection,
//     // concurrency: 50,
//     removeOnComplete: { count: 1000 },
//     removeOnFail: { count: 5000 },
//   }
// );

// worker.on('completed', (job) => {
//   console.info(`${job.id} has completed!`);
// });

// worker.on('failed', (job, err) => {
//   console.info(`${job?.id} has failed with ${err.message}`);
// });

// export default worker;
