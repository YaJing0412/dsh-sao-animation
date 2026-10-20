import pathlib
d = pathlib.Path(r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\dsh-boot")
c = (d/"boot.css").read_text(encoding="utf-8")
c = c.replace("""  height: 1.12em;
  background: #fff;""", """  height: 1.34em;
  background: #fff;""")
c = c.replace("""  font-size: .74em;
  line-height: 1;""", """  font-size: .86em;
  line-height: 1;""")
c = c.replace("""  width: .34em;
  height: .72em;
  margin-top: -.36em;""", """  width: .38em;
  height: .82em;
  margin-top: -.41em;""")
(d/"boot.css").write_text(c, encoding="utf-8")
print("bar sizing bumped")
