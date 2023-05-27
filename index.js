const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const validator = require('validator');
const AWS = require('aws-sdk');

const dynamodbClient = new DynamoDBClient({ region: 'us-east-1' });
const tableName = 'vendors-login';

exports.handler = async (event) => {
  try {
    const { input } = event;

    if (!input || !input.url) {
      throw new Error('Invalid input: URL is missing');
    }

    // Retrieve all website URLs from the DynamoDB table
    const scanCommand = new ScanCommand({
      TableName: tableName,
      ProjectionExpression: 'websiteUrl',
    });

    const scanResult = await dynamodbClient.send(scanCommand);

    if (!scanResult.Items || scanResult.Items.length === 0) {
      throw new Error('No website URLs found');
    }

    const validUrlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;

    const websiteUrls = scanResult.Items
      .map(item => item.websiteUrl)
      .filter(url => validUrlRegex.test(url));

    if (websiteUrls.length === 0) {
      throw new Error('No valid website URLs found');
    }

    // Find the matching website URL for the input URL
    const matchingWebsiteUrl = websiteUrls.find(url => input.url.includes(url));

    if (!matchingWebsiteUrl) {
      throw new Error('No matching website URL found');
    }

    // Apply input validation and sanitization based on the matching website URL
    let sanitizedInput = input;
    if (matchingWebsiteUrl === input.url) {
      if (matchingWebsiteUrl === 'www.example.com/login') {
        // Sanitize and validate username and password
        const sanitizedUsername = validator.escape(input.username);
        const sanitizedPassword = validator.trim(input.password);

        if (!sanitizedUsername || !sanitizedPassword) {
          throw new Error('Invalid input: Username or password is missing');
        }

        sanitizedInput = {
          ...input,
          username: sanitizedUsername,
          password: sanitizedPassword,
        };
      } else if (matchingWebsiteUrl === 'www.example.com/register') {
        // Sanitize and validate name and email
        const sanitizedName = validator.escape(input.name);
        const sanitizedEmail = validator.trim(input.email);

        if (!sanitizedName || !sanitizedEmail || !validator.isEmail(sanitizedEmail)) {
          throw new Error('Invalid input: Name or email is missing or invalid');
        }

        sanitizedInput = {
          ...input,
          name: sanitizedName,
          email: sanitizedEmail,
        };
      }
    }

    // Perform additional processing based on the sanitized input
    // Example: Store the sanitized input in a database or trigger further actions

    return {
      success: true,
      sanitizedInput,
    };
  } catch (error) {
    console.error('Error processing input:', error);

    // Log the error to CloudWatch Logs
    const cloudwatchlogs = new AWS.CloudWatchLogs();
    const logGroupName = '/var/log/input-validation';
    const logStreamName = 'lambda-input-validation';

    await cloudwatchlogs.createLogGroup({ logGroupName }).promise();
    await cloudwatchlogs.createLogStream({ logGroupName, logStreamName }).promise();

    await cloudwatchlogs.putLogEvents({
      logGroupName,
      logStreamName,
      logEvents: [
        {
          message: `Error processing input: ${error}`,
          timestamp: new Date().getTime(),
        },
      ],
    }).promise();

    throw new Error('Failed to process input');
  }
};
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
