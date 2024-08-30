import AWS from "aws-sdk";

const endpoint = new AWS.Endpoint(import.meta.env.S3_ENDPOINT);

AWS.config.update({
  accessKeyId: import.meta.env.S3_ID,
  secretAccessKey: import.meta.env.S3_SECRET,
  region: "auto", // 对于R2，不需要指定特定region
});

const s3 = new AWS.S3({
  endpoint: endpoint,
  signatureVersion: "v4", // 使用S3 v4签名
});

// 上传文件
export const uploadImage = async (key: string, body: any) => {
  const params = {
    Bucket: import.meta.env.S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: "image/jpeg", // 根据图片格式调整
  };
  return s3.upload(params).promise();
};

// 下载文件
export const getImage = async (key: string) => {
  const params = {
    Bucket: import.meta.env.S3_BUCKET,
    Key: key,
  };
  const data = await s3.getObject(params).promise();
  return data.Body;
};
