import { extractJotunScheduleData, parseJotunScheduleAndImport } from './jotunScheduleParser';

export async function importJotunScheduleToProject(projectId: string) {
  const { members, metadata } = extractJotunScheduleData();

  console.log(`Importing Jotun Schedule: ${metadata.enquiryRef}`);
  console.log(`Project: ${metadata.projectName}`);
  console.log(`Company: ${metadata.company}`);
  console.log(`Presented By: ${metadata.presentedBy}`);
  console.log(`Date: ${metadata.date}`);
  console.log(`Standard: ${metadata.standard}`);
  console.log(`Total Members: ${members.length}`);
  console.log('---');

  const result = await parseJotunScheduleAndImport(projectId, members, metadata);

  console.log(`Import completed successfully!`);
  console.log(`Import ID: ${result.importId}`);
  console.log(`Members imported: ${result.memberCount}`);

  return result;
}
