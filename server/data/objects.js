// CommonJS version for Node.js mock server

let mockObjects = [
  {
    key: 'chinese-text.txt',
    title: '练习文章',
    size: 1536,
    lastModified: new Date().toISOString(),
  },
];

const objectContents = {
  'chinese-text.txt': {
    title: '练习文章',
    body: '今天天气很好。我想去公园散步。公园里有很多花和树。',
  },
};

const getMockObjects = () => mockObjects;

const getMockObject = (key) => {
  return objectContents[key] || null;
};

const updateMockObject = (key, title, body) => {
  if (!objectContents[key]) {
    return null;
  }

  if (title !== undefined) {
    objectContents[key].title = title;
  }
  if (body !== undefined) {
    objectContents[key].body = body;
  }

  const objIndex = mockObjects.findIndex(o => o.key === key);
  if (objIndex !== -1) {
    const content = objectContents[key].body || '';
    mockObjects[objIndex].size = Buffer.byteLength(content);
    mockObjects[objIndex].lastModified = new Date().toISOString();
  }

  const responseBody = objectContents[key].body || '';
  return {
    message: 'Object updated successfully',
    key,
    size: Buffer.byteLength(responseBody),
    lastModified: new Date().toISOString(),
    contentType: 'text/plain',
  };
};

const addMockObject = (key, content) => {
  objectContents[key] = content;
  const bodyContent = content.body || '';
  mockObjects.push({
    key,
    size: Buffer.byteLength(bodyContent),
    lastModified: new Date().toISOString(),
  });
};

module.exports = {
  getMockObjects,
  getMockObject,
  updateMockObject,
  addMockObject,
};
