import type { CloudFormationCustomResourceHandler, CloudFormationCustomResourceEvent } from 'aws-lambda';
import { EC2 } from 'aws-sdk';
import { IpPermission } from 'aws-sdk/clients/ec2';
import axios from 'axios';

export const ec2 = new EC2();

export const handler: CloudFormationCustomResourceHandler = async (event) =>
  run(event)
    .then(() => ({ Status: 'SUCCESS' }))
    .catch((err) => ({ Status: 'FAILED', Reason: err.message }))
    .then((body) => ({
      ...body,
      PhysicalResourceId: event.RequestId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    }))
    .then((body) => axios.put(event.ResponseURL, body))
    .then((response) => response.data)
    .then(console.log)
    .catch(console.error);

function prunePermission(permission: IpPermission): IpPermission {
  const entries = Object.entries(permission)
    .filter(([, value]) => !(value instanceof Array) || value.length);
  return Object.fromEntries(entries);
}

function assertValid(properties: any) {
  if (!properties.VpcIds) {
    throw new Error('missing property: "VpcIds"');
  }

  if (!(properties.VpcIds instanceof Array)) {
    throw new TypeError('property value "VpcIds" must be an Array');
  }
}

async function run(event: CloudFormationCustomResourceEvent) {
  let vpcIds: string[] | undefined;
  switch (event.RequestType) {
    case 'Create':
      assertValid(event.ResourceProperties);
      vpcIds = event.ResourceProperties.VpcIds;
      break;

    case 'Update':
      assertValid(event.ResourceProperties);
      vpcIds = event.ResourceProperties.VpcIds.filter(
        (id: string) => !event.OldResourceProperties.VpcIds.includes(id));
      break;

    case 'Delete':
      // do nothing
      return;
  }
  if (!vpcIds || vpcIds.length === 0) return;

  const groups = await ec2
    .describeSecurityGroups({
      Filters: [
        { Name: 'vpc-id', Values: vpcIds },
        { Name: 'group-name', Values: ['default'] },
      ],
    })
    .promise()
    .then((data) => data.SecurityGroups || []);

  const ingress = groups
    .filter(({ IpPermissions }) => IpPermissions?.length)
    .map(({ GroupId, IpPermissions }) => ec2
      .revokeSecurityGroupIngress({
        GroupId,
        IpPermissions: IpPermissions?.map(prunePermission),
      })
      .promise());
  const egress = groups
    .filter(({ IpPermissionsEgress }) => IpPermissionsEgress?.length)
    .map(({ GroupId, IpPermissionsEgress }) => ec2
      .revokeSecurityGroupEgress({
        GroupId: GroupId as string,
        IpPermissions: IpPermissionsEgress?.map(prunePermission),
      })
      .promise());

  return Promise.all([...ingress, ...egress]);
}
