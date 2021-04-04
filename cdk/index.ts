import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Duration, RemovalPolicy, Stack } from '@aws-cdk/core';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';

const app = new App();

const stack = new Stack(app, 'Stack', {
  stackName: 'ec2-revoke-default-rules',
});

const handler = new NodejsFunction(stack, 'Handler', {
  entry: 'src/index.ts',
  bundling: {
    minify: true,
    sourceMap: true,
  },
  timeout: Duration.minutes(1),
  environment: {
    NODE_OPTIONS: '--enable-source-maps',
  },
});

handler.configureAsyncInvoke({
  maxEventAge: Duration.minutes(1),
  retryAttempts: 0,
});

handler.addToRolePolicy(new PolicyStatement({
  actions: [
    'ec2:DescribeSecurityGroups',
  ],
  resources: [
    '*',
  ],
}));

handler.addToRolePolicy(new PolicyStatement({
  actions: [
    'ec2:RevokeSecurityGroupIngress',
    'ec2:RevokeSecurityGroupEgress',
  ],
  resources: [
    stack.formatArn({
      service: 'ec2',
      resource: 'security-group',
      resourceName: '*',
    }),
  ],
}));

stack.exportValue(handler.functionArn, {
  name: `${stack.stackName}:ServiceToken`,
});

new LogGroup(handler, 'LogGroup', {
  logGroupName: `/aws/lambda/${handler.functionName}`,
  retention: RetentionDays.ONE_WEEK,
  removalPolicy: RemovalPolicy.DESTROY,
});
