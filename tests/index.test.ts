import type { Context } from 'aws-lambda';
import axios from 'axios';
import { ec2, handler } from '../src';

jest.mock('aws-sdk');
jest.mock('axios');

const context = {} as Context;
const callback = jest.fn();

describe('Lambda handler', () => {
  it('Create event', async () => {
    ec2.describeSecurityGroups = jest.fn().mockReturnValue({
      promise: () => Promise.resolve({
        SecurityGroups: [
          {
            GroupId: 'sg-dummy',
            IpPermissions: [{ IpRanges: [] }],
            IpPermissionsEgress: [{}],
          },
        ],
      }),
    });
    ec2.revokeSecurityGroupIngress = jest.fn().mockReturnValue({
      promise: () => Promise.resolve(),
    });
    ec2.revokeSecurityGroupEgress = jest.fn().mockReturnValue({
      promise: () => Promise.resolve(),
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

    expect(ec2.describeSecurityGroups).toBeCalled();
    expect(ec2.revokeSecurityGroupIngress).toBeCalled();
    expect(ec2.revokeSecurityGroupEgress).toBeCalled();
    expect(mockedPut).toBeCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Update event', async () => {
    ec2.describeSecurityGroups = jest.fn().mockReturnValue({
      promise: () => Promise.resolve({
        SecurityGroups: [
          {
            GroupId: 'sg-dummy',
            IpPermissions: [{}],
            IpPermissionsEgress: [{}],
          },
        ],
      }),
    });
    ec2.revokeSecurityGroupIngress = jest.fn().mockReturnValue({
      promise: () => Promise.resolve(),
    });
    ec2.revokeSecurityGroupEgress = jest.fn().mockReturnValue({
      promise: () => Promise.resolve(),
    });
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

    expect(ec2.describeSecurityGroups).toBeCalled();
    expect(ec2.revokeSecurityGroupIngress).toBeCalled();
    expect(ec2.revokeSecurityGroupEgress).toBeCalled();
    expect(mockedPut).toBeCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Update event without change', async () => {
    ec2.describeSecurityGroups = jest.fn();
    ec2.revokeSecurityGroupIngress = jest.fn();
    ec2.revokeSecurityGroupEgress = jest.fn();
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

    expect(ec2.describeSecurityGroups).not.toBeCalled();
    expect(ec2.revokeSecurityGroupIngress).not.toBeCalled();
    expect(ec2.revokeSecurityGroupEgress).not.toBeCalled();
    expect(mockedPut).toBeCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Delete event', async () => {
    ec2.describeSecurityGroups = jest.fn();
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Delete',
      ResourceProperties: {
        VpcIds: ['vpc-dummy'],
      },
    } as any, context, callback);

    expect(ec2.describeSecurityGroups).not.toBeCalled();
    expect(mockedPut).toBeCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('SUCCESS');
  });

  it('Failure', async () => {
    ec2.describeSecurityGroups = jest.fn().mockReturnValue({
      promise: () => Promise.reject({
        message: 'Test error',
      }),
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

    expect(ec2.describeSecurityGroups).toBeCalled();
    expect(mockedPut).toBeCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('FAILED');
    expect(mockedPut.mock.calls[0][1].Reason).toBe('Test error');
  });

  it('without VpcIds', async () => {
    ec2.describeSecurityGroups = jest.fn();
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Create',
      ResourceProperties: {},
    } as any, context, callback);

    expect(ec2.describeSecurityGroups).not.toBeCalled();
    expect(mockedPut).toBeCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('FAILED');
  });

  it('with scalar VpcIds', async () => {
    ec2.describeSecurityGroups = jest.fn();
    const mockedPut = axios.put = jest.fn().mockResolvedValue({
      data: {},
    });

    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        VpcIds: 'vpc-dummy',
      },
    } as any, context, callback);

    expect(ec2.describeSecurityGroups).not.toBeCalled();
    expect(mockedPut).toBeCalled();
    expect(mockedPut.mock.calls[0][1].Status).toBe('FAILED');
  });
});
