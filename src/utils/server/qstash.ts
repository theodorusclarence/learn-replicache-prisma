class QstashHelper {
  sendOctokitEvent(data: SendOctokitEventRequestBody) {
    const url = `${process.env.QSTASH_URL}octokit-queue`;
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
      }),
    });
  }
}

export type SendOctokitEventRequestBody = {
  todoId: string;
  eventId: string;
};

const eventBus = new QstashHelper();

export default eventBus;
