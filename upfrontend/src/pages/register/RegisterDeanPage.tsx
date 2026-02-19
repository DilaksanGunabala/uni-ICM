import { StaffRegisterPage } from "./StaffRegisterPage";

export function RegisterDeanPage() {
  return (
    <StaffRegisterPage
      roleName="DEAN"
      roleLabel="Dean"
      emailPlaceholder="dean@eng.jfn.ac.lk"
      requireDepartment={false}
    />
  );
}
