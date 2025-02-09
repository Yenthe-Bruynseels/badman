import { Field, ID } from '@nestjs/graphql';
import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Claim } from './claim.model';
import { Role } from './role.model';

@Table({
  timestamps: true,
  schema: 'security',
})
export class RoleClaimMembership extends Model {
  @ForeignKey(() => Role)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  roleId?: string;

  @ForeignKey(() => Claim)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  claimId?: string;
}
