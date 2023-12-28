import axios from 'axios';
import { nanoid } from 'nanoid:3';

async function main() {
  const promises = [...new Array(1000)].map(() => {
    return axios.post(
      'http://localhost:3000/api/v3/pull?spaceId=dummy-space-id',
      {
        profileID: nanoid(),
        clientGroupID: nanoid(),
        cookie: 0,
        pullVersion: 1,
        schemaVersion: '19',
      }
    );
  });

  //#region  //*=========== Reflect ===========
  interface ResolvedResult<T> {
    status: 'resolved';
    value: T;
  }

  interface RejectedResult {
    status: 'rejected';
    error: any; // Adjust the type based on the expected error type
  }

  type ReflectResult<T> = ResolvedResult<T> | RejectedResult;
  function reflect<T>(promise: Promise<T>): Promise<ReflectResult<T>> {
    return promise
      .then((value) => ({ status: 'resolved', value }))
      .catch((error) => ({ status: 'rejected', error })) as Promise<
      ReflectResult<T>
    >;
  }
  //#endregion  //*======== Reflect ===========

  Promise.all(promises.map(reflect)).then((results) => {
    const successCount = results.filter(
      (result) => result.status === 'resolved'
    ).length;
    const failureCount = results.filter(
      (result) => result.status === 'rejected'
    ).length;

    console.log(`Successes: ${successCount}, Failures: ${failureCount}`);

    console.log(
      results
        .filter((r) => r.status === 'rejected')
        // @ts-ignore
        .map((r) => r.error.response.data)[0]
    );
  });
}

main();

export default main;
