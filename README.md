# Synopsis

Revokes all ingress and egress rules defined in default security groups of VPCs.
It acts as a custom resource in CloudFormation stack, and updates security group rules to conform [CIS Standards](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cis-controls.html#securityhub-cis-controls-4.3).

# Deployment

``` sh
yarn cdk deploy
```

See [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#cli-deploy) for details.

# Usage

Deploy the function, and define a custom resource in CloudFormation templates.
Target VPC(s) can be specified via resource property `VpcIds` of type `List<AWS::EC2::VPC::Id>`.

``` yaml
AWSTemplateFormatVersion: 2010-09-09

Resources:
  EC2VPC4P5ZW:
    Type: 'AWS::EC2::VPC'
    Properties:
      CidrBlock: 192.0.2.0/24

  CFCRBNN6:
    Type: 'AWS::CloudFormation::CustomResource'
    Properties:
      ServiceToken: !ImportValue ec2-revoke-default-rules:ServiceToken
      VpcIds:
        - !Ref EC2VPC4P5ZW
```
