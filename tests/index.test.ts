import type { Context } from 'aws-lambda';
import { DescribeSecurityGroupsCommand, EC2Client, RevokeSecurityGroupEgressCommand, RevokeSecurityGroupIngressCommand } from '@aws-sdk/client-ec2';
import axios from 'axios';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler } from '../src';

jest.mock('axios');

const ec2 = mockClient(EC2Client);
afterEach(() => {
  ec2.reset();
});

const context = {} as Context;
const callback = jest.fn();

describe('Lambda handler', () => {
  it('Create event', async () => {
    ec2
      .on(DescribeSecurityGroupsCommand)
      .resolves({
        SecurityGroups: [
          {
            GroupId: 'sg-dummy',
            IpPermissions: [{ IpRanges: [] }],
            IpPermissionsEgress: [{}],
          },
        ],
      })
      .on(RevokeSecurityGroupIngressCommand)
      .resolves({})
      .on(RevokeSecurityGroupEgressCommand)
      .resolves({});
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        VpcIds: ['vpc-dummy'],
      },
    } as any, context, callback);

    expect(ec2).toHaveReceivedCommand(DescribeSecurityGroupsCommand);
    expect(ec2).toHaveReceivedCommand(RevokeSecurityGroupIngressCommand);
    expect(ec2).toHaveReceivedCommand(RevokeSecurityGroupEgressCommand);
    expect(mockedPut).toHaveBeenCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Update event', async () => {
    ec2
      .on(DescribeSecurityGroupsCommand)
      .resolves({
        SecurityGroups: [
          {
            GroupId: 'sg-dummy',
            IpPermissions: [{}],
            IpPermissionsEgress: [{}],
          },
        ],
      })
      .on(RevokeSecurityGroupIngressCommand)
      .resolves({})
      .on(RevokeSecurityGroupEgressCommand)
      .resolves({});
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Update',
      ResourceProperties: {
        VpcIds: ['vpc-dummy1', 'vpc-dummy2'],
      },
      OldResourceProperties: {
        VpcIds: ['vpc-dummy1'],
      },
    } as any, context, callback);

    expect(ec2).toHaveReceivedCommand(DescribeSecurityGroupsCommand);
    expect(ec2).toHaveReceivedCommand(RevokeSecurityGroupIngressCommand);
    expect(ec2).toHaveReceivedCommand(RevokeSecurityGroupEgressCommand);
    expect(mockedPut).toHaveBeenCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Update event without change', async () => {
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Update',
      ResourceProperties: {
        VpcIds: ['vpc-dummy1'],
      },
      OldResourceProperties: {
        VpcIds: ['vpc-dummy1', 'vpc-dummy2'],
      },
    } as any, context, callback);

    expect(ec2).not.toHaveReceivedCommand(DescribeSecurityGroupsCommand);
    expect(ec2).not.toHaveReceivedCommand(RevokeSecurityGroupIngressCommand);
    expect(ec2).not.toHaveReceivedCommand(RevokeSecurityGroupEgressCommand);
    expect(mockedPut).toHaveBeenCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Delete event', async () => {
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Delete',
      ResourceProperties: {
        VpcIds: ['vpc-dummy'],
      },
    } as any, context, callback);

    expect(ec2).not.toHaveReceivedCommand(DescribeSecurityGroupsCommand);
    expect(mockedPut).toHaveBeenCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Failure', async () => {
    ec2
      .on(DescribeSecurityGroupsCommand)
      .rejects({
        message: 'Test error',
      });
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        VpcIds: ['vpc-dummy'],
      },
    } as any, context, callback);

    expect(ec2).toHaveReceivedCommand(DescribeSecurityGroupsCommand);
    expect(mockedPut).toHaveBeenCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('FAILED');
    expect(mockedPut.mock.calls[0][1].Reason).toBe('Test error');
  });

  it('without VpcIds', async () => {
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Create',
      ResourceProperties: {},
    } as any, context, callback);

    expect(ec2).not.toHaveReceivedCommand(DescribeSecurityGroupsCommand);
    expect(mockedPut).toHaveBeenCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('FAILED');
  });

  it('with scalar VpcIds', async () => {
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        VpcIds: 'vpc-dummy',
      },
    } as any, context, callback);

    expect(ec2).not.toHaveReceivedCommand(DescribeSecurityGroupsCommand);
    expect(mockedPut).toHaveBeenCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('FAILED');
  });
});
